import streamlit as st
import pandas as pd
from streamlit_gsheets import GSheetsConnection
from utils import visualize_tax
import numpy as np
import re
from streamlit_option_menu import option_menu
from sklearn.linear_model import LinearRegression




url: str= 'https://docs.google.com/spreadsheets/d/1RPLu_giMGLKn713muVT1AY8uM42GCwKKtnSC9ExUk6Q/edit?usp=sharing'
conn: GSheetsConnection = st.connection('data_traveloka', type=GSheetsConnection)

df: pd.DataFrame = conn.read(spreadsheet=url, worksheet=0)


def find_word(string_series,searched):
    data=[]
    for string in string_series:
        matches=re.match(pattern=searched,string=string)
        if matches:
            data.append(True)
        else:
            data.append(False)
    series=np.array(data)
    return series

def make_header():
    st.markdown(
        """
        <style>
        header {
            visibility: hidden;
        }
        header:after {
            content: 'GASKEUN TEAM';
            visibility: visible;
            display: block;
            position: relative;
            background-color: #00FFFF;
            padding-left: 20px;
            padding-bottom: 5px;
            font-size: 50px;
            color: white;
            text-align: center;
            font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
        }
        </style>
        """,
        unsafe_allow_html=True
    )

make_header()

def make_footer():
    st.markdown(
        """
        <style>
        footer{
            visibility: hidden;
        }
        footer:after {
            content: 'Made with Care by Ayuk, Lanang, & Raihan';
            visibility: visible;
            display: block;
            position: relative;
            padding-left: 20px;
            padding-bottom: 5px;
            font-size: 15px;
            font-color: blue;
            color: white;
            text-align: center;
            font-family: 'Franklin Gothic Medium', 'Arial Narrow', Arial, sans-serif;
        }
        </style>
        """,
        unsafe_allow_html=True
    )

make_footer()


with st.sidebar:
    selection = option_menu(
        menu_title= "Pilih menu aplikasi",
        options=['Home', 'Analysis', 'Search', 'Recommendation'],
        menu_icon='cast',
        default_index=0,
        orientation='vertical',
    )


if selection == "Home":
    st.title("HOME")
    st.header(':hotel: Analysis of Hotels in Bali with :blue[Traveloka]')
    
    st.subheader('', divider='rainbow')

    st.subheader("Overview:")
    st.write("Analysis of Hotels in Bali with Traveloka adalah sebuah aplikasi yang menyediakan analisis dan informasi tentang berbagai hotel di pulau Bali, Indonesia, dengan fokus pada kebutuhan para wisatawan. Aplikasi ini  bertujuan untuk membantu wisatawan dalam memilih akomodasi yang sesuai dengan preferensi dan anggaran mereka selama kunjungan ke Bali. Informasi. Pengguna dapat menemukan data terperinci tentang beragam hotel di Bali, termasuk nama, lokasi, rating, dan harga.")
    st.write("Layanan ini dapat membantu wisatawan dalam merencanakan perjalanan mereka dengan lebih baik, memungkinkan mereka untuk membandingkan hotel-hotel yang berbeda dan membuat keputusan yang terinformasi. Informasi yang digunakan didapatkan melalui Traveloka dalam website Kaggle pada tahun 2022.")
   
    st.subheader('', divider='rainbow')
    
    st.subheader("Dataset Overview:")
    st.write('Data retrieved from Google Spreadsheet on Kaggle.com')
    st.dataframe(df)
    st.write("Data yang digunakan merupakan data keluaran tahun 2022 yang akan diupdate setiap tahunnya.")
    
    st.subheader('', divider='rainbow')

    kolom_tertentu = ['Hotel Name', 'location'] 

    unique = {}
    
    st.subheader("Periksa Hotel atau Lokasi")
    st.write("Kalian dapat melihat nama hotel dan juga lokasi hotel yang ada di Bali melalui kolom dibawah ini:")
    st.caption("Silahkan pilih antara dua")


    pilihan = st.selectbox("Pilih:", kolom_tertentu)

    for kolom in kolom_tertentu:
        unique[kolom] = df[kolom].unique()

    st.dataframe(pd.DataFrame(unique[pilihan], columns=["Data Unik dari : {}".format(pilihan)]), width=800, height=400)

    st.subheader('', divider='rainbow')

   




if selection == "Analysis":
    st.title("Analysis")
    st.subheader("Checking Highest and Lowest Rating of Hotels in Bali")
    
    pil_rate = st.selectbox(
        "Pilih:",
        ("Highest", "Lowest"))
    
    if pil_rate == "Highest":
        st.subheader("Highest Rated Hotel")
        st.caption("Disini kita dapat melihat rating hotel tertinggi lho!")
        highest_rating_hotel=df[["Rating","Hotel Name"]].sort_values(by=["Rating"],ascending=False)
        st.dataframe(highest_rating_hotel, width=800, height=400)

        
    if pil_rate == "Lowest":
        st.subheader("Lowest Rated Hotel")
        st.caption("Disini kita dapat melihat rating hotel terendah lho!")
        lowest_rating_hotel=df[["Rating","Hotel Name"]].sort_values(by=["Rating"],ascending=True)
        st.dataframe(lowest_rating_hotel, width=800, height=400)

    st.subheader('', divider='rainbow')

    st.subheader("Pilih Rating")
    
    st.write("Disini kita dapat melihat banyaknya hotel dengan rating tertentu lho!")
    kolom_sendiri=("Hotel Name", "Original price", "Price after discount", "location")
    selected_rating = st.slider("Pilih Rating", min_value=0, max_value=10, value=(0, 10))
    option2 = st.selectbox("Data Hotel dengan Rating antara {} dan {}".format(selected_rating[0], selected_rating[1]), kolom_sendiri)    
    st.line_chart(df.loc[(df["Rating"] >= selected_rating[0]) & (df["Rating"] <= selected_rating[1])], x="Rating",y=option2)

    st.subheader('', divider='rainbow')

    st.subheader('Taxes')
    st.write('Data berikut merupakan grafik dari harga hotel-hotel pada tabel diatas yang sudah termasuk pajak.')
    st.pyplot(visualize_tax(df))
    st.write('Dapat dilihat bahwa semua harga hotel yang berada pada dataset sudah termasuk pajak.')

    st.subheader('', divider='rainbow')
    







if selection == "Search":
    st.subheader("Serching Bali's Hotel in Traveloka")
    st.caption("Silahkan melakukan pencarian mengenai hotel di Bali yang telah terdata pada Traveloka")
    search_box = st.text_input("Search :")
    searched_data=df.loc[find_word(df["Hotel Name"],r".*"+search_box+r".*")]
    cari_hotel=searched_data[["Hotel Name", "Original price"]].sort_values(by=["Original price"],ascending=False)
    st.dataframe(cari_hotel, width=1200,hide_index=True)

    st.subheader('', divider='rainbow')









if selection == "Recommendation":
    st.title("Recommendation")
     
    st.subheader('', divider='rainbow')

    # Preprocess 'Original price' column
    df['Original price'] = df['Original price'].str.replace('Rp', '').str.replace('.', '').str.replace(',', '.').astype(float)

    st.header('Rekomendasi Hotel')
    rating = st.slider('Masukkan Rating (0.0-10.0)', 0.00, 10.00, 7.00)
    harga = st.slider('Masukkan Harga', 0.0, 15000000.0, 5022000.0)

    # Tombol "Cari Rekomendasi"
    if st.button('Cari Rekomendasi'):
        # Simpan data input pengguna dalam variabel
        input_pengguna = {'Rate': rating, 'Price': harga}
        # Filter data hotel berdasarkan rating dan harga yang diinginkan
        filtered_hotels = df[(df['Rating'] >= input_pengguna['Rate']) & (df['Original price'] <= input_pengguna['Price'])]
        # Jika ada hotel yang sesuai, ambil 5 hotel pertama sebagai rekomendasi
        if not filtered_hotels.empty:
            st.subheader('Rekomendasi Hotel:')
            st.dataframe(filtered_hotels)
        else:
            st.warning('Maaf, tidak ada hotel yang sesuai dengan kriteria Anda.')
